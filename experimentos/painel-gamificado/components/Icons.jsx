export function Icon({name}){
  if(name==='missions')return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9Zm-1 9 2 2 3-3m1 6h2m-8 0h3"/></svg>;
  const paths={arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,home:<path d="m3 10 9-7 9 7v10H3Zm6 10v-7h6v7"/>,growth:<path d="M4 20V4m0 16h16M8 15l4-5 4 2 4-7"/>,check:<path d="m5 12 4 4L19 6"/>,photo:<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,box:<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4m-9 4v10M7 5l10 5"/>,info:<><circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/></>};
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]??paths.arrow}</svg>;
}
export function Brand(){return <svg aria-hidden="true" viewBox="0 0 40 40"><path d="m20 5 13 18-8 2-5-8-5 8-8-2ZM16 26h8v10h-8Z" fill="currentColor"/></svg>;}
