FROM node:12

WORKDIR /usr/src/app

RUN apt update && apt install -y bash-completion xvfb imagemagick
RUN wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sh /dev/stdin

COPY . .
COPY package*.json .

RUN yarn

CMD nodejs worker.js