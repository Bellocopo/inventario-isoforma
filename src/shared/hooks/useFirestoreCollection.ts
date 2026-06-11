import { FirebaseError } from "firebase/app";
import { onSnapshot, type Query } from "firebase/firestore";
import { useEffect, useState } from "react";

type State<T> = {
  query: Query<T> | null;
  data: T[];
  error: FirebaseError | null;
};

export function useFirestoreCollection<T>(query: Query<T> | null): {
  data: T[];
  loading: boolean;
  error: FirebaseError | null;
} {
  const [state, setState] = useState<State<T>>({
    query,
    data: [],
    error: null,
  });

  useEffect(() => {
    if (!query) return;

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setState({
          query,
          data: snapshot.docs.map((doc) => doc.data()),
          error: null,
        });
      },
      (err) => {
        console.error("[useFirestoreCollection] listener error:", err);
        setState((prev) => ({ ...prev, query, error: err }));
      },
    );

    return unsubscribe;
  }, [query]);

  // loading é derivado: se a query mudou mas o state ainda não recebeu o snapshot dela
  const loading = query !== null && state.query !== query;
  return {
    data: state.query === query ? state.data : [],
    loading,
    error: state.query === query ? state.error : null,
  };
}
