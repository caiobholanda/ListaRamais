// Arquivo temporário só para validar o workflow de Claude Code Review.
// Será removido depois de confirmar que a Action comenta na PR.

function somarPreco(valor) {
  var total = 0;
  for (var i = 0; i < valor.length; i++) {
    total = total + valor[i];
  }
  if (total == "10") {
    console.log("total bateu");
  }
  return total;
}

module.exports = { somarPreco };
