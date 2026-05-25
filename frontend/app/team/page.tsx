"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Organization } from "@/lib/api";

export default function TeamPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.listOrganizations().then(setOrgs).catch(() => {});
  }, []);

  async function createOrg(e: FormEvent) {
    e.preventDefault();
    const org = await api.createOrganization({ name, slug });
    setOrgs((prev) => [...prev, org]);
    setMessage(`Created ${org.name}`);
    setName("");
    setSlug("");
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Team & Organizations</h1>
        <p className="page-sub">Shared curricula and multi-user learning groups.</p>
      </header>

      <form className="card" onSubmit={createOrg} style={{ marginBottom: 24 }}>
        <h2 className="card-title">Create organization</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            className="v2-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="v2-input"
            placeholder="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
          <button type="submit" className="v2-btn primary">
            Create
          </button>
        </div>
      </form>

      {message && <p className="pill ok">{message}</p>}

      <div className="card-grid">
        {orgs.map((o) => (
          <article key={o.id} className="card">
            <h3 className="card-title">{o.name}</h3>
            <p className="card-sub">{o.description ?? o.slug}</p>
            <span className="pill muted">{o.member_count} members</span>
          </article>
        ))}
      </div>
    </div>
  );
}
