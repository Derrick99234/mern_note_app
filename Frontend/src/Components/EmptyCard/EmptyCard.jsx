/* eslint-disable react/prop-types */
function EmptyCard({ imgSrc, message }) {
  return (
    <div className="flex flex-col justify-center items-center mt-20">
      <img src={imgSrc} alt="No Note" className="w-60" />
      <p className="w-1/2 text-sm font-medium text-slat-700 leading-7 text-center mt-5">
        {message}
      </p>
    </div>
  );
}

export default EmptyCard;
