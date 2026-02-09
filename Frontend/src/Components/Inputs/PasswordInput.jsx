import PropTypes from "prop-types";
import { useState } from "react";

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [passwordVisibility, setPasswordVisibility] = useState(false);

  const toggleVisibility = () => {
    setPasswordVisibility(!passwordVisibility);
  };

  return (
    <div className="flex items-center bg-transparent border-[1.5px] px-5 rounded mb-3">
      <input
        type={passwordVisibility ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Password"}
        className="w-full text-sm bg-transparent py-3 mr-3 rounded outline-none"
      />
      <span
        className="text-primary cursor-pointer text-2xl"
        onClick={toggleVisibility}
      >
        o
      </span>
    </div>
  );
};

PasswordInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

export default PasswordInput;
