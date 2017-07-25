FROM node:8.2-slim

MAINTAINER Cl3MM

ENV APP_PATH=/data \
    STDOUT_LOC=/proc/1/fd/1 \
    STDERR_LOC=/proc/1/fd/2

WORKDIR $APP_PATH

COPY package.json /tmp

RUN \
      cd /tmp \
      && apt-get update && apt-get install -y bzip2 cron libfontconfig --no-install-recommends \
      && ln -sf /proc/1/fd/1 /var/log/cron \
      && npm install \
      && cp -a /tmp/node_modules ${APP_PATH}/ \
      && mkdir -p $APP_PATH \
      && cp /usr/share/zoneinfo/Europe/Paris /etc/localtime \
      && echo "Europe/Paris" >  /etc/timezone \
      && dpkg-reconfigure -f noninteractive tzdata \
      && apt-get purge -y --auto-remove \
      && sed -e '/pam_loginuid.so/ s/^#*/#/' -i /etc/pam.d/cron

COPY crontab /tmp

RUN \
      crontab /tmp/crontab \
      && rm -rf /tmp/* \
      && cd $APP_PATH

COPY cr* ${APP_PATH}/
COPY package.json ${APP_PATH}/
COPY signature.jpg ${APP_PATH}/
COPY quittance.* ${APP_PATH}/

CMD ["node", "-v"]
