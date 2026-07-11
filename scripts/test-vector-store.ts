import { BaseMessage } from "@langchain/core/messages";
import { chat, loadPDF, retrieveDocs, splitDocuments, vectorStoreDocuments } from "../lib/loader";

const history: BaseMessage[] = [];
async function main() {
  const docs = await loadPDF("data/LANG2 - Résumé - CF.pdf");
  const chunks = await splitDocuments(docs);
  console.log(`Loaded ${docs.length} documents and split into ${chunks.length} chunks.`);
  const store = await vectorStoreDocuments(chunks);
  const results = await retrieveDocs("passive voice", store, 3);

  console.log(JSON.stringify({ chunks: chunks.length, results: results.length }, null, 2));
  console.log("chunk 1:", results[1]?.pageContent?.slice(0, 1000));
  await chat("hi", history, store);

  await chat("what is passive voice?", history, store);
  await chat("give examples", history, store);

  console.log(history);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

