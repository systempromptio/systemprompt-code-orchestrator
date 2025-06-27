FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY . .
RUN npm run build
ARG PORT=3000
EXPOSE ${PORT}
CMD ["node", "build/index.js"]