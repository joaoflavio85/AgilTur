FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY uploads ./uploads

EXPOSE 3001

CMD ["npm", "run", "start"]
