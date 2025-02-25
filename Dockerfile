FROM node:23
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN mkdir -p /app/data
COPY ./chotikai-7904-token-summaries.txt /app/data/chotikai-7904-token-summaries.txt
CMD ["node","app.js"]
