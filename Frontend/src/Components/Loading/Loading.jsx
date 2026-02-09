/* eslint-disable react/prop-types */
const Loading = ({ type = 'spinner', size = 'md', className = '' }) => {
  if (type === 'dots') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  // Default spinner
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-[3px]',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={`inline-block ${className}`}>
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-current border-t-transparent animate-spin`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

export default Loading;
