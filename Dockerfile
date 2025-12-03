FROM nginx:alpine

# Удаляем ВСЕ файлы из веб-папки
RUN rm -rf /usr/share/nginx/html/*

# Копируем ТОЛЬКО нужные файлы
COPY index.html /usr/share/nginx/html/
COPY main.js /usr/share/nginx/html/
COPY clipping-algorithms.js /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]