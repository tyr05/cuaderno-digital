import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Asistencia from "./pages/Asistencia";
import Estudiantes from "./pages/Estudiantes";
import Family from "./pages/Family";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route
            path="/"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/asistencia"
            element={<PrivateRoute><Asistencia /></PrivateRoute>}
          />
          <Route
            path="/estudiantes"
            element={<PrivateRoute><Estudiantes /></PrivateRoute>}
          />
          <Route
            path="/familia"
            element={<PrivateRoute><Family /></PrivateRoute>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
