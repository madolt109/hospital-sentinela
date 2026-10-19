const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: []
    };
  }

  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// LOGIN
app.post("/login", (req, res) => {
  const db = readDB();

  const user = db.usuarios.find(u =>
    u.usuario === req.body.usuario &&
    u.senha === req.body.senha
  );

  if (!user) {
    return res.status(401).json({ erro: "Login inválido" });
  }

  res.json(user);
});

// ATENDIMENTO
app.post("/atendimento", (req, res) => {
  const db = readDB();

  const paciente = {
    id: Date.now(),
    nome: req.body.nome,
    cpf: req.body.cpf,
    tipo: req.body.tipo,
    status: "triagem",
    createdAt: new Date()
  };

  db.pacientes.push(paciente);
  writeDB(db);

  res.json(paciente);
});

// ANÁLISE DE RISCO
// Regras automáticas preliminares; não é IA generativa.
function analisarRisco(sintoma, temperatura, observacao = "") {
  const texto = observacao.toLowerCase();

  const emergencias = [
    "infarto",
    "avc",
    "convulsao",
    "hemorragia",
    "falta_ar_grave"
  ];

  const sinaisEmergencia = [
    "dor no peito intensa",
    "desmaio",
    "inconsciente",
    "lábios roxos",
    "labios roxos",
    "confusão súbita",
    "confusao subita",
    "fraqueza de um lado",
    "fala enrolada",
    "sangramento intenso"
  ];

  if (
    emergencias.includes(sintoma) ||
    sinaisEmergencia.some(sinal => texto.includes(sinal))
  ) {
    return {
      risco: "vermelho",
      motivo: "Possível sinal de emergência. O paciente precisa de avaliação imediata pela equipe de saúde.",
      urgente: true
    };
  }

  if (
    temperatura >= 39 ||
    temperatura < 35 ||
    sintoma === "falta_ar_moderada" ||
    sintoma === "febre" ||
    sintoma === "vomito" ||
    sintoma === "diarreia"
  ) {
    return {
      risco: "amarelo",
      motivo: "Os dados indicam necessidade de avaliação clínica prioritária. A equipe deve avaliar o estado geral e os demais sinais vitais.",
      urgente: false
    };
  }

  return {
    risco: "verde",
    motivo: "As regras preliminares não identificaram os sinais de alerta previstos. Isso não exclui condições graves; é necessária avaliação profissional.",
    urgente: false
  };
}

// API PARA ANALISAR ANTES DE SALVAR
app.post("/analisar-risco", (req, res) => {
  const { sintoma, temperatura, observacao } = req.body;

  if (
    typeof sintoma !== "string" ||
    !sintoma ||
    typeof temperatura !== "number" ||
    !Number.isFinite(temperatura) ||
    temperatura < 25 ||
    temperatura > 45
  ) {
    return res.status(400).json({
      erro: "Informe o sintoma e uma temperatura válida."
    });
  }

  res.json(analisarRisco(sintoma, temperatura, observacao));
});

// SALVAR TRIAGEM
app.post("/triagem", (req, res) => {
  const db = readDB();

  const { nome, sintoma, temperatura, alergia, observacao } = req.body;

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof sintoma !== "string" ||
    !sintoma ||
    typeof temperatura !== "number" ||
    !Number.isFinite(temperatura) ||
    temperatura < 25 ||
    temperatura > 45
  ) {
    return res.status(400).json({
      erro: "Confira o nome, o sintoma e a temperatura."
    });
  }

  const analise = analisarRisco(sintoma, temperatura, observacao);

  const triagem = {
    id: Date.now(),
    nome: nome.trim(),
    sintoma,
    temperatura,
    alergia: alergia || "",
    observacao: observacao || "",
    risco: analise.risco,
    motivoRisco: analise.motivo,
    status: "aguardando_medico",
    createdAt: new Date()
  };

  db.triagens.push(triagem);
  writeDB(db);

  res.json(triagem);
});

// LISTAR TRIAGENS
app.get("/triagens", (req, res) => {
  const db = readDB();
  res.json(db.triagens);
});

// LISTA DE MEDICAÇÕES
app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// CONSULTA
app.post("/consulta", (req, res) => {
  const db = readDB();

  const consulta = {
    id: Date.now(),
    paciente: req.body.paciente,
    diagnostico: req.body.diagnostico,
    medicacao: req.body.medicacao,
    obs: req.body.obs,
    createdAt: new Date()
  };

  db.consultas.push(consulta);
  writeDB(db);

  res.json(consulta);
});

// MEDICAÇÕES REGISTRADAS
app.get("/medicacoes", (req, res) => {
  const db = readDB();
  res.json(db.consultas);
});

// INICIAR SERVIDOR
app.listen(process.env.PORT || 3000, () => {
  console.log("Hospital Sentinela iniciado!");
});
