# Roteiro de demonstração

Demonstração de cerca de 5 minutos, reproduzível a partir de um clone limpo. Todos os dados são
fictícios. Os números abaixo foram conferidos no navegador e valem para os valores indicados.

## Preparação

No PowerShell, depois de clonar o repositório e entrar na pasta:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --port 8010
```

Abra <http://127.0.0.1:8010>. Se a porta estiver ocupada, escolha outro número.

## Passos

Na abertura, clique em **Testar uma promoção**. O exemplo usa R$ 5 de desconto e começa
pela diferença entre a meta de 25 pedidos concluídos e a capacidade de 22. O [vídeo de
24 segundos](capturas/demo-promocao.mp4) registra a interface anterior a este fluxo.

1. **O que é.** Mostre o aviso: simulação ilustrativa com dados fictícios e IA local opcional.
2. **Resultado sem preencher nada.** Leia o resumo: 18 de 20 pedidos ficaram prontos, e o valor que
   sobra é R$ 283,50. Explique que impostos, salários, aluguel e desperdício não foram descontados.
3. **Testar a própria promoção.** Abra **Cenários → Testar minha promoção** e preencha R$ 5 em
   **Editar hipótese**. O valor que sobra cai R$ 4,25 por pedido e R$ 76,50 no turno com 20 recebidos
   e 18 prontos. O volume é uma hipótese informada. Para guardar ou substituir a base manualmente,
   abra **Comparar cenários avançados**.
4. **Ver onde acumula.** Em "Simulador" → "Ver exemplos fictícios", aplique "acúmulo no preparo". Os valores são
   substituídos e o cenário A é mantido. O resumo aponta onde os pedidos estão acumulando.
5. **Acompanhar o turno.** Abra "Restaurante", clique em "Iniciar" e use a velocidade 4×. A cena mostra o momento do
   relógio, e os indicadores continuam sendo do turno completo. O gargalo só aparece no fim.
6. **Selecionar uma estação.** Clique em "Preparo" na cena ou no botão, e compare os dados do momento
   com os do turno completo.
7. **Comportamento em falha.** Volte ao "Simulador" e digite um desconto maior que o preço. A mensagem aparece no campo, e a
   página avisa que os dados são do último cenário válido.
8. **Limites honestos.** Mostre `docs/progress.md`: o que foi verificado, o que não foi, e que a
   facilidade de uso ainda não foi validada com usuários.

## O que não afirmar

- Que os cálculos são feitos pela IA. A integração opcional explica valores calculados pelo simulador.
- Que o simulador aumenta resultados de um negócio. Nenhum benefício foi medido.
- Que a interface é fácil de usar. Isso depende do teste em `docs/teste-de-uso.md`.
