const sheetId = "1ym99Rtiw74VlWNmVA2PzIIkSxbZ54mT9XkKgUuASybQ";
const sheetName = "Completo";

fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`)
    .then(res => res.text())
    .then(text => {
        const json = JSON.parse(text.substring(47, text.length - 2)).table.rows;
        let output = "";
        json.forEach(row => {
            const id = row.c[0]?.v || "";
            const nome = row.c[1]?.v || "";
            const abrev = row.c[2]?.v || "";
            const idlocal = row.c[3]?.v || "";
            const desc = row.c[4]?.v || "";
            const tipo = row.c[5]?.v || "";
            output += `
        <div id="content-leg">
          <div id="leg">
        <div id="numero" class="${tipo}">
          <div id="id"> ${id}</div>
        </div>
        <div class="conteudo">
          <span class="nome">${nome}</span>
          <span class="abrev">${abrev}</span>
          <span class="idlocal">${idlocal}</span> 
          <span class="descricao" id="desc">${desc}</span>
        </div>
      </div>
    </div>
  `;
        });
        document.querySelector(".data").innerHTML = output;
    })
    .catch(err => console.error(err));
