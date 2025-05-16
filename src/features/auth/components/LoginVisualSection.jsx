import loginBg from '@/assets/images/login/login-bg.jpg';

export default function LoginVisualSection() {
  return (
    <div
      className="hidden md:block w-[70%] h-screen bg-cover bg-center relative"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute bottom-15 left-15 text-white font-sora">
        <h2 className="text-[32px] font-semibold">Facilite sua Gestão de Pedidos</h2>
        <p className="text-[14px] mt-2">A gestão de pedidos que seu restaurante precisa</p>
      </div>
    </div>
  );
}
