FROM node:14-slim
LABEL maintainer="Kevin Sieverding <kontakt@kevinsieverding.de>"

EXPOSE 8080

WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci --no-optional
RUN npm cache clean --force

COPY *.js /app/

ENTRYPOINT ["node", "index.js"]

CMD [""]
