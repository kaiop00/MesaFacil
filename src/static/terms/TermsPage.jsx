import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import mesafacil from '@/assets/mesafacil.png';

export default function TermsPage() {
    useEffect(() => window.scrollTo(0, 0));
    
    return (
        <div className="font-inter min-h-screen bg-gray-50">
            {/* Header */}
            <header className="w-full bg-white flex justify-between items-center px-8 py-4 shadow-md">
                <Link to="/">
                    <img src={mesafacil} alt="logo" className="w-40 sm:w-32" />
                </Link>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12 max-w-5xl">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Termos de Uso</h1>
                    
                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">TERMOS E CONDIÇÕES GERAIS DE USO DA PLATAFORMA MESA FÁCIL</h2>
                        <p className="text-gray-600 mb-6"><strong>Última atualização:</strong> 14 de janeiro de 2026</p>
                        
                        <p className="mb-4">
                            Pelo presente instrumento particular, a <strong>IDEIA LTDA.</strong>, pessoa jurídica de direito privado, com sede na cidade de <strong>Quixeramobim, Estado do Ceará</strong>, doravante denominada <strong>“MesaFácil”</strong>, estabelece os presentes <strong>Termos e Condições Gerais de Uso</strong> (“<strong>Termos de Uso</strong>”), que regulam o acesso e a utilização da plataforma digital denominada <strong>MesaFácil</strong>, por usuários finais e estabelecimentos parceiros.
                        </p>
                        <p className="mb-6">
                            O acesso, navegação ou utilização da plataforma implica <strong>aceitação plena, irrestrita e vinculante</strong> destes Termos, bem como da Política de Privacidade, constituindo contrato válido e eficaz para todos os fins de direito.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">1. DEFINIÇÕES</h3>
                        <p className="mb-2">Para os fins destes Termos, considera-se:</p>
                        <p className="mb-6">
                            I. <strong>Plataforma</strong>: o sistema MesaFácil, acessível via web, aplicativo ou QR Code;<br/>
                            II. <strong>Usuário Final</strong>: pessoa física que utiliza a plataforma para consultar cardápio, realizar pedidos ou solicitar pagamento;<br/>
                            III. <strong>Restaurante Parceiro</strong>: pessoa jurídica ou empresário individual que utiliza a plataforma para gestão de pedidos e atendimento;<br/>
                            IV. <strong>Serviços</strong>: funcionalidades disponibilizadas pela MesaFácil, conforme descritas neste Termo.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">2. OBJETO</h3>
                        <p className="mb-2">
                            O presente Termo tem por objeto regular o acesso e a utilização da plataforma MesaFácil, que disponibiliza solução tecnológica para:
                        </p>
                        <p className="mb-4">
                            a) consulta de cardápio digital;<br/>
                            b) realização e gestão de pedidos;<br/>
                            c) acompanhamento de consumo;<br/>
                            d) facilitação de pagamentos;<br/>
                            e) gestão administrativa de estabelecimentos parceiros.
                        </p>
                        <p className="mb-6">
                            A MesaFácil <strong>não se caracteriza como fornecedora de alimentos, bebidas ou serviços de restaurante</strong>, limitando-se à prestação de serviço tecnológico.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">3. FUNCIONALIDADES</h3>
                        <p className="font-medium mb-2">3.1. Usuários finais</p>
                        <p className="mb-2">A MesaFácil disponibiliza, conforme habilitação do estabelecimento:</p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>acesso ao cardápio digital via QR Code;</li>
                            <li>realização de pedidos;</li>
                            <li>acompanhamento do status do pedido;</li>
                            <li>solicitação de pagamento e divisão de conta;</li>
                            <li>integração com plataformas externas, quando aplicável.</li>
                        </ul>

                        <p className="font-medium mb-2">3.2. Restaurantes parceiros</p>
                        <p className="mb-2">Aos restaurantes parceiros, a plataforma oferece:</p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>painel administrativo (dashboard);</li>
                            <li>gestão de pedidos em tempo real;</li>
                            <li>relatórios operacionais e financeiros;</li>
                            <li>controle de estoque;</li>
                            <li>suporte técnico e atualizações.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">4. CADASTRO E CREDENCIAIS</h3>
                        <p className="font-medium mb-2">4.1. Usuários finais</p>
                        <p className="mb-4">
                            O acesso poderá ocorrer sem cadastro. Caso haja cadastro, o usuário declara que as informações fornecidas são verdadeiras, completas e atualizadas, responsabilizando-se civil e criminalmente por eventuais falsidades.
                        </p>

                        <p className="font-medium mb-2">4.2. Restaurantes parceiros</p>
                        <p className="mb-6">
                            O restaurante parceiro deverá manter sigilo absoluto sobre suas credenciais de acesso, sendo <strong>inteiramente responsável por qualquer atividade realizada sob sua conta</strong>, ainda que por terceiros.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">5. OBRIGAÇÕES DAS PARTES</h3>
                        <p className="font-medium mb-2">5.1. Obrigações da MesaFácil</p>
                        <p className="mb-4">Constituem obrigações da MesaFácil:</p>
                        <p className="mb-6">
                            I. disponibilizar a plataforma conforme suas especificações técnicas;<br/>
                            II. empregar esforços razoáveis para manter a estabilidade do sistema;<br/>
                            III. proteger os dados pessoais conforme a legislação vigente;<br/>
                            IV. prestar suporte técnico nos limites contratados.
                        </p>

                        <p className="font-medium mb-2">5.2. Obrigações dos usuários finais</p>
                        <p className="mb-4">O usuário compromete-se a:</p>
                        <p className="mb-6">
                            I. utilizar a plataforma de forma lícita e ética;<br/>
                            II. respeitar as normas do estabelecimento;<br/>
                            III. não praticar atos que prejudiquem a plataforma ou terceiros.
                        </p>

                        <p className="font-medium mb-2">5.3. Obrigações dos restaurantes parceiros</p>
                        <p className="mb-4">O restaurante parceiro obriga-se a:</p>
                        <p className="mb-6">
                            I. manter informações corretas e atualizadas;<br/>
                            II. cumprir integralmente a legislação sanitária, consumerista e fiscal;<br/>
                            III. responder exclusivamente pela qualidade, preparo, entrega e cobrança dos pedidos;<br/>
                            IV. isentar a MesaFácil de quaisquer reclamações, demandas ou prejuízos decorrentes de sua atuação.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">6. PAGAMENTOS E TRANSAÇÕES FINANCEIRAS</h3>
                        <p className="mb-4">
                            Os pagamentos realizados por meio da plataforma são processados por <strong>terceiros especializados</strong>, não sendo a MesaFácil responsável pelo processamento financeiro.
                        </p>
                        <p className="mb-4">
                            A MesaFácil <strong>não armazena dados sensíveis de pagamento</strong>, atuando exclusivamente como intermediadora tecnológica.
                        </p>
                        <p className="mb-6">
                            Reembolsos, estornos ou cancelamentos são de responsabilidade do restaurante parceiro, salvo quando a MesaFácil for formalmente solicitada a intermediar.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">7. LIMITAÇÃO DE RESPONSABILIDADE</h3>
                        <p className="mb-4">A MesaFácil não será responsável por:</p>
                        <p className="mb-6">
                            I. falhas de conexão, internet ou dispositivos dos usuários;<br/>
                            II. erros operacionais de usuários ou restaurantes;<br/>
                            III. atrasos, cancelamentos ou problemas na entrega de pedidos;<br/>
                            IV. danos indiretos, lucros cessantes ou prejuízos de qualquer natureza;<br/>
                            V. eventos de caso fortuito ou força maior.
                        </p>
                        <p className="mb-6">
                            A responsabilidade da MesaFácil, quando aplicável, <strong>limita-se estritamente ao valor eventualmente pago pelo serviço</strong>, nos termos da legislação vigente.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">8. PROPRIEDADE INTELECTUAL</h3>
                        <p className="mb-6">
                            Todos os direitos de propriedade intelectual relativos à plataforma MesaFácil pertencem exclusivamente à <strong>IDEIA LTDA.</strong>, sendo vedada qualquer reprodução, modificação, distribuição ou exploração sem autorização expressa e por escrito.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">9. PROTEÇÃO DE DADOS E LGPD</h3>
                        <p className="mb-4">
                            O tratamento de dados pessoais observará rigorosamente a Lei nº 13.709/2018 (LGPD), conforme disposto na Política de Privacidade.
                        </p>
                        <p className="mb-6">
                            A MesaFácil atua como <strong>controladora ou operadora de dados</strong>, conforme o caso, adotando medidas técnicas e administrativas aptas a proteger os dados pessoais.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">10. SUSPENSÃO E RESCISÃO</h3>
                        <p className="mb-4">
                            A MesaFácil poderá, a seu exclusivo critério, suspender ou rescindir o acesso à plataforma, sem aviso prévio, em caso de:
                        </p>
                        <p className="mb-6">
                            I. violação destes Termos;<br/>
                            II. uso indevido ou ilícito;<br/>
                            III. risco à segurança da plataforma ou de terceiros.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">11. ALTERAÇÕES CONTRATUAIS</h3>
                        <p className="mb-6">
                            A MesaFácil poderá alterar estes Termos a qualquer tempo. A continuidade do uso após a publicação das alterações implica concordância tácita e irrestrita.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">12. LEI APLICÁVEL E FORO</h3>
                        <p className="mb-6">
                            Este Termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de <strong>Quixeramobim/CE</strong>, com renúncia a qualquer outro, por mais privilegiado que seja.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">13. DISPOSIÇÕES GERAIS</h3>
                        <p className="mb-6">
                            A eventual nulidade de qualquer cláusula não afetará a validade das demais. A tolerância de qualquer das partes não implicará novação ou renúncia de direitos.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">14. CONTATO</h3>
                        <p className="mb-6">
                            📧 <strong>E-mail:</strong> kaioportela10@gmail.com<br/>
                            📞 <strong>Telefone:</strong> (88) 9 8849-9692
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
