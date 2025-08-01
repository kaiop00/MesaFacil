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
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">TERMOS DE USO – MESA FÁCIL</h2>
                        <p className="text-gray-600 mb-6">Última atualização: 24/07/2025</p>
                        
                        <p className="mb-6">
                            Este documento estabelece os Termos e Condições Gerais de Uso da
                            plataforma MesaFácil, disponibilizada por MesaFácil Tecnologia Ltda., com sede na
                            cidade de [Quixeramobim/ce], doravante denominada simplesmente "MesaFácil".
                            Ao acessar ou utilizar os serviços disponibilizados pela plataforma, o usuário declara ter
                            lido, compreendido e aceitado os presentes termos, vinculando-se integralmente a eles.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">1. OBJETO</h3>
                        <p className="mb-6">
                            O presente Termo regula o uso da plataforma MesaFácil, que oferece uma solução
                            digital para pedidos e pagamentos em restaurantes por meio de leitura de QR Code, bem
                            como ferramentas administrativas para os estabelecimentos parceiros.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">2. FUNCIONALIDADES DA PLATAFORMA</h3>
                        <p className="font-medium mb-2">2.1. Para usuários (clientes finais):</p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>Acesso ao cardápio digital do restaurante via QR Code;</li>
                            <li>Realização de pedidos diretamente pelo celular;</li>
                            <li>Acompanhamento do status do pedido;</li>
                            <li>Opção de pagamento via cartão de crédito, débito ou PIX, com possibilidade de dividir a conta.</li>
                        </ul>

                        <p className="font-medium mb-2">2.2. Para restaurantes parceiros:</p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>Acesso ao painel de controle (dashboard);</li>
                            <li>Gestão de pedidos em tempo real;</li>
                            <li>Relatórios financeiros e de desempenho;</li>
                            <li>Suporte técnico e atualizações da plataforma.</li>
                            <li>Controle de estoque</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">3. CADASTRO E ACESSO</h3>
                        <p className="font-medium mb-2">3.1. Usuários finais:</p>
                        <p className="mb-4">
                            O uso da plataforma pelos clientes pode ocorrer sem necessidade de cadastro, apenas
                            com a leitura do QR Code. Em casos de pagamento via app ou uso recorrente, o usuário
                            poderá optar por realizar um cadastro com dados básicos (nome, e-mail, etc.).
                        </p>

                        <p className="font-medium mb-2">3.2. Restaurantes parceiros:</p>
                        <p className="mb-6">
                            Os estabelecimentos devem fornecer dados empresariais e de contato para habilitação
                            da conta administrativa. O acesso ao painel é restrito mediante login e senha de uso
                            exclusivo.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">4. RESPONSABILIDADES</h3>
                        <p className="font-medium mb-2">4.1. Da MesaFácil:</p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>Garantir o funcionamento da plataforma, salvo em situações excepcionais ou de manutenção programada;</li>
                            <li>Proteger os dados dos usuários conforme a Política de Privacidade;</li>
                            <li>Oferecer suporte técnico aos estabelecimentos parceiros.</li>
                        </ul>

                        <p className="font-medium mb-2">4.2. Dos usuários finais:</p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>Utilizar o sistema de forma ética e conforme a legislação vigente;</li>
                            <li>Fornecer informações verdadeiras e completas quando solicitado;</li>
                            <li>Respeitar as regras do estabelecimento em que está utilizando o serviço.</li>
                        </ul>

                        <p className="font-medium mb-2">4.3. Dos restaurantes parceiros:</p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>Manter atualizadas as informações do cardápio e preços;</li>
                            <li>Zelar pela qualidade do atendimento e preparo dos pedidos;</li>
                            <li>Não utilizar a plataforma para fins ilícitos ou contrários às normas sanitárias e de consumo.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">5. PAGAMENTOS</h3>
                        <p className="mb-6">
                            Os pagamentos efetuados por meio da plataforma são processados por terceiros
                            especializados em meios de pagamento. A MesaFácil não armazena dados completos
                            de cartões de crédito e atua apenas como intermediadora entre cliente e restaurante.
                            Eventuais reembolsos, cancelamentos ou ajustes deverão ser tratados diretamente com o
                            restaurante responsável, salvo nos casos em que a equipe da MesaFácil for solicitada a
                            intermediar.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">6. PROPRIEDADE INTELECTUAL</h3>
                        <p className="mb-6">
                            Todos os direitos relativos à plataforma MesaFácil, incluindo interface, layout, nome,
                            marca, software, funcionalidades e banco de dados, são de titularidade exclusiva da
                            empresa. É proibida a reprodução, cópia, distribuição ou qualquer forma de uso não
                            autorizado.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">7. PRIVACIDADE E PROTEÇÃO DE DADOS</h3>
                        <p className="mb-6">
                            A utilização da plataforma está sujeita à Política de Privacidade, a qual descreve com
                            transparência como os dados pessoais são coletados, utilizados e protegidos. Ao utilizar
                            o sistema, o usuário declara estar ciente e de acordo com as práticas descritas naquele
                            documento.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">8. SUSPENSÃO E CANCELAMENTO DE ACESSO</h3>
                        <p className="mb-6">
                            A MesaFácil poderá, a seu exclusivo critério, suspender ou cancelar o acesso de
                            usuários ou parceiros que descumpram os presentes Termos ou utilizem a plataforma de
                            forma indevida, fraudulenta ou contrária à legislação.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">9. MODIFICAÇÕES DOS TERMOS DE USO</h3>
                        <p className="mb-6">
                            A MesaFácil reserva-se o direito de alterar estes Termos a qualquer momento. As
                            alterações entrarão em vigor assim que publicadas. O uso contínuo da plataforma após
                            tais alterações será interpretado como aceitação integral das novas condições.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">10. LIMITAÇÃO DE RESPONSABILIDADE</h3>
                        <p className="mb-6">
                            A MesaFácil não se responsabiliza por:
                        </p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>Problemas técnicos nos dispositivos dos usuários;</li>
                            <li>Falhas na conexão com a internet;</li>
                            <li>Erros operacionais cometidos por restaurantes ou usuários;</li>
                            <li>Interrupções causadas por eventos de força maior.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">11. LEI APLICÁVEL E FORO</h3>
                        <p className="mb-6">
                            Estes Termos de Uso são regidos pela legislação da República Federativa do Brasil.
                            Fica eleito o foro da comarca de [cidade da sede da empresa] para dirimir eventuais
                            litígios, com exclusão de qualquer outro.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">12. CONTATO</h3>
                        <p className="mb-6">
                            Em caso de dúvidas, sugestões ou solicitações, entre em contato com a equipe
                            MesaFácil:
                        </p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>📧 E-mail: kaioportela10@gmail.com</li>
                            <li>📞 Telefone: (88) 9 8849 - 9692</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}