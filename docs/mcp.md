# MCP local

O servidor expõe duas ferramentas de consulta sobre promoções. Ele usa os mesmos modelos de
entrada e o mesmo motor Python da API web. As ferramentas calculam cenários sem chamar Ollama
e sem abrir uma porta de rede.

## Instalar e conectar

Com o ambiente virtual do [README](../README.md#como-executar) ativado, execute na raiz:

```bash
python -m pip install -r requirements-mcp.txt
python -m src.simulador.mcp_servidor
```

O processo aguarda um cliente MCP via stdio. Em um cliente que aceite configuração JSON no
formato `mcpServers`, aponte para o executável Python do ambiente e para a raiz do projeto.

```json
{
  "mcpServers": {
    "restaurant-ai-insights": {
      "command": "/caminho/restaurant-ai-insights/.venv/bin/python",
      "args": ["-m", "src.simulador.mcp_servidor"],
      "env": { "PYTHONPATH": "/caminho/restaurant-ai-insights" }
    }
  }
}
```

No Windows, use o caminho absoluto para `.venv/Scripts/python.exe`.

## Ferramentas

| Ferramenta | Parâmetro `hipotese` | Resultado |
| --- | --- | --- |
| `simular_promocao` | `base` e `promocional`, com todos os campos do simulador | Contribuição, comparação, meta e capacidade operacional. |
| `comparar_alternativas` | Os mesmos cenários, mais `desconto_menor_centavos`, `estacao` e `custo_adicional_centavos` | Pedidos prontos, contribuição, custo adicional e resultado após reforço. |

Os campos dos cenários são números JSON. Use reais para preços, descontos e custos dos cenários.
Os valores monetários dos resultados e os campos adicionais com sufixo `_centavos` são centavos
inteiros. A estação do reforço é `pessoas_preparo` ou `pessoas_embalagem`.

Para gerar os argumentos do caso demonstrado e colá-los em um cliente, execute:

```python
import json
from src.simulador.parametros import campos_para_interface

base = {campo["nome"]: campo["padrao"] for campo in campos_para_interface()}
hipotese = {
    "base": base,
    "promocional": {**base, "desconto": 5, "pedidos": 30},
    "desconto_menor_centavos": 300,
    "estacao": "pessoas_preparo",
    "custo_adicional_centavos": 2010,
}
print(json.dumps({"hipotese": hipotese}, indent=2))
```

O exemplo de `comparar_alternativas` retorna `29040` centavos após custos nas duas opções,
com 22 e 27 pedidos prontos. Para `simular_promocao`, passe apenas `base` e `promocional`
dentro de `hipotese`.

## Verificar

```bash
python -m pytest -q tests/test_mcp.py
```

O teste inicia o servidor em um subprocesso, consulta o inventário e compara a resposta
estruturada das ferramentas com a API HTTP. Cenários inválidos retornam erro da ferramenta.
