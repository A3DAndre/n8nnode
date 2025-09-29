

rm -rf ./custom_nodes/dist
pnpm --prefix custom_nodes install 
pnpm --prefix custom_nodes run build

docker compose build

# docker compose up 