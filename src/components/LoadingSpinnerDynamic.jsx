const LoadingSpinnerDynamic = ({ size = 5 }) => {
  return (
    <div
      className={`w-${size} h-${size} border-2 rounded-full animate-spin`}
      style={{
        borderColor: "rgb(var(--color-primary))",
        borderTopColor: "transparent",
      }}
    />
  );
};

export default LoadingSpinnerDynamic;
