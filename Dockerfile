FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY db ./db
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]