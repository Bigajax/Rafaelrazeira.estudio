"use client";

import { useEffect, useRef, useState } from "react";
import s from "./placas.module.css";

/** Isola o CSS da arte e mantém uma única rolagem na página do CRM. */
export function EditorPlacas({ html }: { html: string }) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const [altura, setAltura] = useState(1100);

  useEffect(() => {
    const frame = quadro.current;
    if (!frame) return;
    let observador: ResizeObserver | undefined;
    let encerrado = false;
    const medir = () => {
      if (encerrado || !frame.contentDocument?.body) return;
      setAltura(Math.ceil(frame.contentDocument.body.getBoundingClientRect().height) + 2);
    };
    const conectar = () => {
      observador?.disconnect();
      const corpo = frame.contentDocument?.body;
      if (!corpo) return;
      observador = new ResizeObserver(medir);
      observador.observe(corpo);
      void frame.contentDocument?.fonts.ready.then(medir);
      medir();
    };
    frame.addEventListener("load", conectar);
    if (frame.contentDocument?.readyState === "complete") conectar();
    return () => {
      encerrado = true;
      observador?.disconnect();
      frame.removeEventListener("load", conectar);
    };
  }, [html]);

  return <iframe ref={quadro} className={s.editor} title="Editor de placas do Performance" srcDoc={html} style={{ height: altura }} />;
}
