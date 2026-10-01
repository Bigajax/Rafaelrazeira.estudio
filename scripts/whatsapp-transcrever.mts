/* ============================================================
   A TRANSCRIÇÃO DOS ÁUDIOS DO LEITOR (01/10/2026)

   Lojista responde muito por áudio, e o card só mostrava "[áudio]": a
   resposta contava, mas ninguém sabia o que ela dizia. O Rafael pediu
   transcrição gratuita, então ela roda NO PC, sem serviço de fora: o áudio
   de lead nunca sai da máquina.

   O motor é o whisper.cpp (a versão do Whisper feita para rodar no
   processador), com o modelo small comprimido em q5_1, uns
   190 MB, bom em português e com meio giga de memória só enquanto
   transcreve. O PC do estúdio tem 7,8 GB e costuma ficar com 1 GB livre;
   o medium seria melhor e não cabe com folga.

   Fica FORA do repositório, em ~/whisper (o git e a Vercel não carregam
   190 MB). Para montar num PC novo:
     - https://github.com/ggml-org/whisper.cpp/releases (whisper-bin-x64.zip)
       descompactado em ~/whisper/bin
     - https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin
       em ~/whisper
   O ffmpeg vem do pacote ffmpeg-static: o áudio do WhatsApp é ogg/opus, e
   o whisper.cpp só lê WAV de 16 kHz.

   Sem o whisper instalado, nada quebra: o áudio continua entrando como
   "[áudio]", como antes.
   ============================================================ */
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";

const rodar = promisify(execFile);

const PASTA = process.env.WHISPER_DIR || path.join(os.homedir(), "whisper");
const CLI = path.join(PASTA, "bin", "Release", "whisper-cli.exe");
const MODELO = path.join(PASTA, "ggml-small-q5_1.bin");

/* Áudio de mais de 10 minutos não é resposta de lead, é palestra: fica
   como "[áudio]" e o Rafael escuta no celular. */
export const MAIS_LONGO_SEGUNDOS = 10 * 60;

export const transcricaoDisponivel = () =>
  Boolean(ffmpeg) && fs.existsSync(CLI) && fs.existsSync(MODELO);

export async function transcrever(audio: Buffer): Promise<string | null> {
  if (!transcricaoDisponivel()) return null;
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "leitor-audio-"));
  try {
    const entrada = path.join(pasta, "audio.ogg");
    const wav = path.join(pasta, "audio.wav");
    fs.writeFileSync(entrada, audio);
    await rodar(ffmpeg as unknown as string, ["-y", "-loglevel", "error", "-i", entrada, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav], {
      timeout: 60_000,
    });
    /* -nt sem marcação de tempo, -np sem o relatório do modelo: o stdout
       sai só com o texto. Metade dos núcleos, para o PC seguir usável. */
    const { stdout } = await rodar(CLI, ["-m", MODELO, "-l", "pt", "-f", wav, "-nt", "-np", "-t", "6"], {
      timeout: 5 * 60_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    const texto = stdout.replace(/\s+/g, " ").trim();
    return texto || null;
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
}
