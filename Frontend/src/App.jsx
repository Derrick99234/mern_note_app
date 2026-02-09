import Home from "./Pages/Home/Home";
import WritingAssistant from "./Pages/WritingAssistant/WritingAssistant";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login/Login";
import SignUp from "./Pages/SignUp/SignUp";
const App = () => {
  const routes = (
    <Router>
      <Routes>
        <Route path="" exact element={<Login />} />
        <Route path="/login" exact element={<Login />} />
        <Route path="/dashboard" exact element={<Home />} />
        <Route path="/write" exact element={<WritingAssistant />} />
        <Route path="/signup" exact element={<SignUp />} />
      </Routes>
    </Router>
  );

  return <div>{routes}</div>;
};

export default App;
