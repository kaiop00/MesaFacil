const LoadingSpinner = ({ size = 5}) => {
  return (
    <div
      className={`w-${size} h-${size} border-2 border-white border-t-transparent rounded-full animate-spin`}
    />
  );
};

export default LoadingSpinner;
