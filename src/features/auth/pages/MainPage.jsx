import loginBg from '@/assets/images/login/login-bg.jpg';
import logo from '@/assets/logo-white.png';
import mesafacil from '@/assets/mesafacil.png';
import mesafacil_white from '@/assets/mesafacil_white.png'
import { LogOut, CircleCheck } from "react-coolicons"
import { Navigate, useNavigate, Link } from "react-router-dom";
import Instagram from '../components/Instagram';
import Facebook from '../components/Facebook';

export default function MainPage() {
    const navigate = useNavigate();

    return (
        <>
            <div className="font-inter h-screen overflow-hidden relative">
                {/* Header fixo */}
                <header className="absolute top-0 left-0 w-full bg-white flex justify-between items-center px-8 py-4 z-20 shadow-md">
                    <img src={mesafacil} alt="logo" className="w-40 sm:w-32" />

                    <button className="bg-[#F8912E] text-white font-medium rounded px-4 py-2 hover:opacity-90 transition text-sm sm:text-base cursor-pointer" onClick={() => navigate("/login")}>
                        Acessar Sistema
                    </button>
                </header>

                {/* Fundo com imagem e gradiente */}
                <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{ backgroundImage: `url(${loginBg})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent z-10" />
                </div>

                {/* Logo e textos */}
                <div className="absolute bottom-36 md:bottom-24 left-1/2 md:left-24 transform -translate-x-1/2 md:translate-x-0 text-center md:text-left z-20 w-11/12 md:w-auto">
                    <img src={logo} alt="Logo" className="mb-4 mx-auto md:mx-0 w-40 md:w-auto" />

                    <h2 className="text-white text-lg md:text-xl lg:text-2xl font-semibold font-sora">
                        Uma solução completa para seu restaurante
                    </h2>
                    <p className="text-white text-sm md:text-base mt-2 font-sora">
                        Dashboards, Gerenciamento de Pedidos, Cardápio, Promoções e muito mais.
                    </p>
                </div>

                {/* Botão inferior */}
                <div className="absolute bottom-12 lg:bottom-24 right-1/2 lg:right-24 transform lg:translate-x-0 translate-x-1/2 z-20">
                    <button className="bg-white rounded-full flex items-center gap-2 px-8 py-5 shadow-md text-sm md:text-base cursor-pointer" onClick={() => navigate("/login")}>
                        <LogOut className="w-8 h-8 text-[#F89950]" />
                        <span className="text-[#1E293B]">Clique para Acessar</span>
                    </button>
                </div>
            </div>
            {/* Features Section */}
            <div id="beneficios" className="flex flex-col justify-center bg-black mx-auto px-4 py-20 min-h-dvh">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
                        Tudo que você precisa para o seu negócio
                    </h2>
                    <p className="text-white text-lg md:text-xl">
                        Conheça as principais funcionalidades da nossa plataforma
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {[
                        { title: 'Gerenciamento de Pedidos', description: 'Controle total dos pedidos em tempo real' },
                        { title: 'Cardápio Digital', description: 'Atualização em tempo real dos itens' },
                        { title: 'Relatórios Avançados', description: 'Análises detalhadas do seu negócio' },
                        { title: 'Controle de Estoque', description: 'Acompanhe seus produtos automaticamente' },
                        { title: 'Promoções Especiais', description: 'Crie ofertas personalizadas' },
                        { title: 'Atendimento ao Cliente', description: 'Ferramentas para fidelização' }
                    ].map((feature, index) => (
                        <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 p-2 rounded-full">
                                    <CircleCheck className="w-6 h-6 text-[#F8912E]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-white font-semibold text-lg">{feature.title}</h3>
                                    <p className="text-white/70 text-sm">{feature.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Testimonials Section */}
            <div id="depoimentos" className="bg-white py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            O que as pessoas que usam o <span className="text-orange-400">mesafacil</span> dizem sobre ele
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                name: 'Carlos Silva',
                                role: 'Cliente Frequente',
                                avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                                rating: 5,
                                text: '"Agora não preciso mais ficar esperando o garçom pra pedir uma cerveja. Escaneio o QR Code e pronto, chega rapidinho!"'
                            },
                            {
                                name: 'Ana Beatriz',
                                role: 'Mãe e Cliente',
                                avatar: 'https://randomuser.me/api/portraits/women/14.jpg',
                                rating: 5,
                                text: '"Com criança na mesa, tudo precisa ser rápido. Esse sistema MesaFácil facilita muito! Peço, acompanho e já pago em alguns cliques, sem muito esforço."'
                            },
                            {
                                name: 'Roberto Almeida',
                                role: 'Amigo do Grupo',
                                avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
                                rating: 5,
                                text: '"Dividir a conta nunca foi tão fácil. Cada um paga direto pelo app, sem confusão!"'
                            },
                            {
                                name: 'Mariana Costa',
                                role: 'Turista Estrangeira',
                                avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
                                rating: 5,
                                text: '"O cardápio traduzido no app salvou minha viagem. Pedi sem medo e ainda acompanhei tudo pelo celular."'
                            },
                            {
                                name: 'Rafael Mendes',
                                role: 'Dono de Restaurante',
                                avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
                                rating: 5,
                                text: '"Com o dashboard do MesaFácil eu tenho controle total do que está saindo — consigo ver os pedidos em tempo real, o tempo de preparo, e até identificar gargalos no atendimento. É gestão na palma da mão."'
                            },
                            {
                                name: 'Juliana Santos',
                                role: 'Influenciadora Digital',
                                avatar: 'https://randomuser.me/api/portraits/women/43.jpg',
                                rating: 5,
                                text: '"A experiência fica muito mais fluida e tecnológica. Mostrei no meu stories e muita gente ficou curiosa!"'
                            },
                        ].map((testimonial, index) => (
                            <div key={index} className="flex flex-col justify-between bg-gray-100 border-gray-300 rounded-xl p-10 gap-4 h-72 border hover:shadow-lg transition-shadow">
                                <p className="text-gray-700 font-bold mt-0  ">{testimonial.text}</p>
                                <div className="flex items-center">
                                    <img
                                        src={testimonial.avatar}
                                        alt={testimonial.name}
                                        className="w-12 h-12 rounded-full object-cover mr-4"
                                    />
                                    <div className="text-left">
                                        <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                                        <p className="text-sm text-gray-600">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div id="faq" className="bg-gray-50 py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Perguntas Frequentes
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Encontre respostas para as dúvidas mais comuns sobre nossa plataforma
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {[
                            {
                                question: 'Como faço um pedido usando o MesaFácil?',
                                answer: 'Basta escanear o QR Code disponível na sua mesa com a câmera do celular. O cardápio digital vai abrir automaticamente, e você pode escolher seus itens, confirmar o pedido e acompanhar o status em tempo real.'
                            },
                            {
                                question: 'Preciso baixar algum aplicativo para usar o MesaFácil?',
                                answer: 'Não! O MesaFácil funciona direto no navegador do seu celular. É só escanear o QR Code da mesa e começar a usar.'
                            },
                            {
                                question: 'Consigo pagar direto pelo sistema?',
                                answer: 'Sim! Você pode pagar pelo próprio MesaFácil usando PIX, para cartão o garçom vai de imediato até sua mesa. Também é possível dividir a conta com os amigos, cada um pagando sua parte individualmente.'
                            },
                            {
                                question: 'E se eu ver algum problema com meu pedido?',
                                answer: 'O sistema permite que você chame o garçom pelo próprio aplicativo. Além disso, o restaurante recebe notificações em tempo real e pode resolver rapidamente qualquer situação.'
                            },
                            {
                                question: 'O sistema é seguro para fazer pagamentos?',
                                answer: 'Sim. O MesaFácil utiliza protocolos de segurança modernos e parceiros de pagamento confiáveis para garantir total proteção dos seus dados.'
                            },
                            {
                                question: 'Sou dono de restaurante. Posso acompanhar os pedidos em tempo real?',
                                answer: 'Sim! A plataforma conta com um dashboard completo onde você acompanha todos os pedidos em andamento, tempo de preparo, formas de pagamento, e ainda tem acesso a relatórios de vendas e desempenho da equipe.'
                            }
                        ].map((faq, index) => (
                            <div key={index} className="bg-white h-fit rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                                <details className="group">
                                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                        <span className="text-gray-900 text-lg font-sora">{faq.question}</span>
                                        <span className="transition group-open:rotate-180">
                                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24" className="text-gray-500">
                                                <path d="M6 9l6 6 6-6"></path>
                                            </svg>
                                        </span>
                                    </summary>
                                    <p className="text-gray-600 mt-4 group-open:animate-fadeIn">
                                        {faq.answer}
                                    </p>
                                </details>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-[#0F172A] text-white py-12 md:py-16">
                <div className="container mx-auto px-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mx-auto">
                        {/* Logo and Description */}
                        <div className="space-y-4 max-w-64 mt-auto">
                            <img src={mesafacil_white} alt="MesaFácil" className="w-40 mb-4" />
                            <p className="text-gray-400 text-sm font-bold">
                                Soluções completas para gestão de restaurantes e bares. Simplificamos a administração do seu negócio.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div className="lg:m-auto">
                            <ul className="space-y-4">
                                <li>
                                    <a href="#beneficios" className="text-gray-400 font-bold hover:text-white text-sm transition-colors">
                                        Benefícios do MesaFácil
                                    </a>
                                </li>
                                <li>
                                    <a href="#depoimentos" className="text-gray-400 font-bold hover:text-white text-sm transition-colors">
                                        Depoimentos
                                    </a>
                                </li>
                                <li>
                                    <a href="#faq" className="text-gray-400 font-bold hover:text-white text-sm transition-colors">
                                        Perguntas Frequentes
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/*  Quick links 2 */}
                        <div className="lg:ml-auto">
                            <ul className="space-y-4">
                                <li>
                                    <Link to="/politica-privacidade" className="text-gray-400 font-bold hover:text-white text-sm transition-colors">
                                        Política de Privacidade
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/termos" className="text-gray-400 font-bold hover:text-white text-sm transition-colors">
                                        Termos de Uso
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    {/* Copyright */}
                    <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 mt-12 pt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            &copy; {new Date().getFullYear()} mesafacil Inc. Todos os direitos reservados.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <a
                                href="#"
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label="Social"
                            >
                                <Instagram />
                            </a>

                            <a
                                href="#"
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label="Social"
                            >
                               <Facebook />
                            </a>
                        </div>
                    </div>
                </div>

            </footer>
        </>
    );
}
