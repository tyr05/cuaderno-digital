import { apiGet, apiPost } from "../api";

// Inicializa recibos de notificación cuando la familia entra
export const notifyOnLogin = () =>
  apiPost("/api/anuncios/notify-on-login", {});

// Devuelve cantidad de anuncios no leídos
export const getUnreadCount = () =>
  apiGet("/api/anuncios/count/unread");

// Marca un anuncio como leído
export const ackAnuncio = (id) =>
  apiPost(`/api/anuncios/ack/${id}`, {}); 
