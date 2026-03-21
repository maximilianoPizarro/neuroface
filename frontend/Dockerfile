FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production

FROM registry.access.redhat.com/ubi9/nginx-122:latest

COPY --from=build /app/dist/neuroface/browser /opt/app-root/src
COPY nginx.conf "${NGINX_DEFAULT_CONF_PATH}/default.conf"

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
