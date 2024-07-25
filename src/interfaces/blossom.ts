enum BUDKinds {
	BUD01_auth = 24242,
}

interface BUD01_authEvent {
    id: string;
    pubkey: string;
    kind: number;
    content: string;
    created_at: number;
    tags: [
      ["t", string],
      ["x", string],
      ["expiration", string]
    ];
    sig: string;
  }

