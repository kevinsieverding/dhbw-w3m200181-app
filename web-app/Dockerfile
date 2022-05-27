FROM denoland/deno:alpine
LABEL maintainer="Kevin Sieverding <kontakt@kevinsieverding.de>"

EXPOSE 8080

WORKDIR /app

USER deno

ADD . .

CMD ["run", "--allow-net", "index.js"]
