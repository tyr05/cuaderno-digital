import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
