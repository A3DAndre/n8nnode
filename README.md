# Template de Node Personalizado para n8n

Um repositório template para construir nodes personalizados do n8n com suporte a armazenamento vetorial S3, incluindo containerização Docker para desenvolvimento e deploy facilitados.

## Funcionalidades

- **Template de Node Personalizado**: Estrutura pré-configurada para construção de nodes personalizados do n8n
- **Armazenamento Vetorial S3**: Suporte integrado para operações de armazenamento vetorial com backends compatíveis com S3
- **Suporte Docker**: Configuração completa do Docker Compose para desenvolvimento local
- **Automação de Build**: Script shell para build e deploy simplificados

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js (para desenvolvimento local)
- Credenciais AWS S3 ou armazenamento compatível com S3 (para armazenamento vetorial)


### Configure as Variáveis de Ambiente

Renomeie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Em seguida, edite o arquivo `.env` com suas credenciais e configurações.

### Build e Execução

Use o script de build fornecido:

```bash
chmod +x build.sh
./build.sh
```

Este script irá:
- Fazer o build do node personalizado
- Iniciar os serviços do Docker Compose
- Inicializar a instância do n8n com seu node personalizado

### Acesse o n8n

Após a execução, acesse o n8n em `http://localhost:5678`

## Estrutura do Projeto

```
.
├── Dockerfile
├── README.md
├── build.sh
├── custom_nodes
│   ├── README.md
│   ├── index.ts
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── src
│   │   └── S3Vector.node.ts # <------ Exemplo de cusotm node
│   ├── test.js
│   └── tsconfig.json
├── docker-compose.yml
└── node_modules
```

Para criar uma custom node basta criar uma nova implementaçao na pasta custom_node/src/ e acionar a node ao index.ts

```ts
import { INodeType } from 'n8n-workflow';
import { S3Vector } from './src/S3Vector.node';

export const nodeTypes: INodeType[] = [
	new S3Vector(),
];
```

### Desenvolvimento Local

Para desenvolvimento sem Docker:

```bash
cd custom_nodes
pnpm install
pnpm run build
```


## Configuração

### Configurações do n8n

Modifique o `docker-compose.yml` para ajustar as configurações do n8n


## Recursos

- [Documentação do n8n](https://docs.n8n.io/)
- [Desenvolvimento de Nodes do n8n](https://docs.n8n.io/integrations/creating-nodes/)
- [Documentação AWS S3](https://docs.aws.amazon.com/s3/)

## Licença

Licença MIT - veja o arquivo LICENSE para detalhes

## Suporte

Para problemas e questões:
- Abra uma issue neste repositório
- Consulte os fóruns da comunidade n8n
- Revise a documentação do n8n

---

**Nota**: Este é um repositório template. Personalize-o de acordo com os requisitos específicos do seu node personalizado.