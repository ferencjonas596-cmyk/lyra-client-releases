FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV HOST=0.0.0.0 PORT=4310 DATA_DIR=/data
EXPOSE 4310
CMD ["node", "server.mjs"]
