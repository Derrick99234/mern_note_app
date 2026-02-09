import PropTypes from "prop-types";

function EmptyCard({ imgSrc, message }) {
  return (
    <div className="flex flex-col justify-center items-center mt-20">
      <img src={imgSrc} alt="No Note" className="w-48 sm:w-60" />
      <p className="w-full max-w-md px-4 text-sm font-medium text-slat-700 leading-7 text-center mt-5">
        {message}
      </p>
    </div>
  );
}

EmptyCard.propTypes = {
  imgSrc: PropTypes.string,
  message: PropTypes.string,
};

export default EmptyCard;
