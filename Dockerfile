FROM golang:1.27-alpine AS api-build
WORKDIR /src
COPY apps/api/ .
RUN CGO_ENABLED=0 go build -o /api .

FROM scratch AS api
COPY --from=api-build /api /api
ENTRYPOINT ["/api"]

FROM nginx:1-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/dist /usr/share/nginx/html

FROM api AS app
COPY apps/web/dist /web
ENV WEB_DIR=/web
