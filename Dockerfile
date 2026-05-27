FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --dangerously-allow-all-builds --frozen-lockfile
RUN npm install -g serve

EXPOSE 3000

CMD pnpm run build && serve -s dist -l 3000
