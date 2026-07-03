/* BRANDBAND — nome da marca gigante em loop horizontal, abaixo do quem somos */
import { CONFIG } from "../config.js";

export function brandband(){
  const nome = `${CONFIG.brand.name} ${CONFIG.brand.suffix}.`;
  const unit = `<span>${nome}</span>`;
  return `
  <div class="brandband" aria-hidden="true">
    <div class="brandband__track">${unit.repeat(6)}</div>
  </div>`;
}
