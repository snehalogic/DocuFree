import { useEffect, useState } from "react";
import { askDocumentQuestion, getDocuments } from "../api";

export default function AskDocumentPage() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDocuments()
      .then((docs) => {
        console.log("📄 Documents:", docs);
        setDocuments(docs);
      })
      .catch(console.error);
  }, []);

  const handleAsk = async () => {
    if (!selectedDoc || !question) {
      alert("Select document & type a question");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const res = await askDocumentQuestion(selectedDoc, question);
      setAnswer(res.answer || "No response generated");
    } catch (err) {
      setAnswer("Error asking document");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Ask Your Document</h1>

      <select
        value={selectedDoc}
        onChange={(e) => setSelectedDoc(e.target.value)}
        style={{ padding: 10, marginBottom: 20, width: "100%" }}
      >
        <option value="">Select a document</option>
        {documents.map((doc) => (
          <option key={doc} value={doc}>
            {doc}
          </option>
        ))}
      </select>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask something…"
        rows={4}
        style={{ width: "100%", padding: 10 }}
      />

      <button
        onClick={handleAsk}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "12px 24px",
          background: "black",
          color: "white",
          cursor: "pointer",
        }}
      >
        {loading ? "Thinking…" : "Ask"}
      </button>

      {answer && (
        <div style={{ marginTop: 30 }}>
          <h3>Answer</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
