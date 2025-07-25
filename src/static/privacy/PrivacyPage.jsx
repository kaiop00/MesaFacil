import { Link } from 'react-router-dom';
import mesafacil from '@/assets/mesafacil.png';
import { useEffect } from 'react';

export default function PrivacyPage() {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Políticas de Privacidade</h1>

                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">POLÍTICA DE PRIVACIDADE – MESA FÁCIL</h2>
                        <p className="text-gray-600 mb-6">Última atualização: 24/07/2025</p>

                        <p className="mb-4">
                            Esta Política de Privacidade tem como finalidade demonstrar o compromisso
                            da MesaFácil Tecnologia Ltda com a privacidade e a proteção dos dados pessoais
                            coletados de seus usuários, em conformidade com a Lei nº 13.709/2018 – Lei Geral de
                            Proteção de Dados Pessoais (LGPD), e demais legislações aplicáveis.
                            Ao utilizar os serviços da plataforma MesaFácil, o usuário concorda com as práticas
                            descritas nesta Política.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">1. INFORMAÇÕES COLETADAS</h3>
                        <p className="mb-4">
                            A MesaFácil poderá coletar os seguintes dados pessoais:
                        </p>
                        <p className="font-medium mb-2">1.1. Para usuários (clientes dos restaurantes):</p>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>Dados de identificação, como nome (opcional);</li>
                            <li>Dados de contato, como e-mail (em casos de cadastro);</li>
                            <li>Dados de navegação: endereço IP, localização aproximada, tipo de dispositivo e sistema operacional;</li>
                            <li>Dados referentes a pedidos realizados;</li>
                            <li>Dados de pagamento, processados por plataformas terceiras com segurança e criptografia.</li>
                        </ul>

                        <p className="font-medium mb-2">1.2. Para restaurantes parceiros (estabelecimentos comerciais):</p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>Nome do responsável, razão social, CNPJ, e dados comerciais;</li>
                            <li>Dados de login e acesso ao painel administrativo;</li>
                            <li>Histórico de vendas, pedidos e faturamento.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">2. FINALIDADES DO TRATAMENTO DE DADOS</h3>
                        <p className="mb-4">
                            Os dados coletados são tratados com as seguintes finalidades:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Permitir a navegação e uso pleno da plataforma;</li>
                            <li>Gerar e processar pedidos realizados via QR Code nas mesas;</li>
                            <li>Processar pagamentos e transações financeiras;</li>
                            <li>Permitir o acesso ao painel de controle pelos estabelecimentos parceiros;</li>
                            <li>Otimizar a experiência do usuário, com base em dados de uso e navegação;</li>
                            <li>Enviar comunicações informativas ou operacionais;</li>
                            <li>Cumprir obrigações legais ou regulatórias.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">3. COMPARTILHAMENTO DE DADOS</h3>
                        <p className="mb-4">
                            A MesaFácil não compartilha, vende ou aluga os dados pessoais de seus usuários,
                            exceto nos seguintes casos:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Com os restaurantes responsáveis pelos pedidos realizados;</li>
                            <li>Com prestadores de serviços, como intermediadores de pagamento, exclusivamente para fins de processamento de transações;</li>
                            <li>Quando exigido por autoridade competente, mediante ordem judicial ou obrigação legal.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">4. COOKIES E TECNOLOGIAS DE RASTREAMENTO</h3>
                        <p className="mb-4">
                            Utilizamos cookies e tecnologias semelhantes para melhorar a funcionalidade da
                            plataforma, coletar dados estatísticos e lembrar preferências do usuário. O usuário
                            poderá configurar seu navegador para recusar cookies, mas isso poderá afetar a
                            experiência de navegação e uso do sistema.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">5. SEGURANÇA DOS DADOS</h3>
                        <p className="mb-4">
                            A MesaFácil adota medidas técnicas e administrativas adequadas à proteção dos dados
                            pessoais sob sua guarda, incluindo:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Transmissão segura de dados via HTTPS;</li>
                            <li>Armazenamento com controle de acesso;</li>
                            <li>Criptografia de informações sensíveis;</li>
                            <li>Monitoramento e prevenção de acessos não autorizados.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">6. DIREITOS DOS TITULARES DE DADOS</h3>
                        <p className="mb-4">
                            Nos termos da LGPD, os titulares de dados pessoais têm o direito de:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>Confirmar a existência de tratamento;</li>
                            <li>Acessar seus dados;</li>
                            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
                            <li>Portar seus dados para outro fornecedor de serviço;</li>
                            <li>Revogar o consentimento, quando aplicável.</li>
                        </ul>
                        <p className="mb-6">
                            As solicitações devem ser feitas por meio de contato direto, conforme o item 9 abaixo.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">7. RETENÇÃO E EXCLUSÃO DOS DADOS</h3>
                        <p className="mb-6">
                            Os dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades
                            aqui descritas, salvo obrigações legais ou regulatórias específicas que exijam prazos
                            maiores. Após esse período, os dados poderão ser anonimizados ou eliminados,
                            conforme previsto na LGPD.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">8. ALTERAÇÕES NA POLÍTICA DE PRIVACIDADE</h3>
                        <p className="mb-6">
                            A MesaFácil reserva-se o direito de alterar esta Política de Privacidade a qualquer
                            tempo. Recomendamos a leitura periódica. Caso as alterações sejam relevantes, os
                            usuários serão notificados por meio da própria plataforma ou via e-mail, quando
                            aplicável.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">9. CONTATO</h3>
                        <p className="mb-4">
                            Para quaisquer dúvidas, solicitações ou exercício de direitos relativos aos dados
                            pessoais tratados, o titular poderá entrar em contato com o Encarregado de Dados
                            (DPO) da MesaFácil:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-6">
                            <li>📧 E-mail: kaioportela10@gmail.com</li>
                            <li>📞 Telefone: (88) 9 8849 - 9692</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">10. LEI APLICÁVEL E FORO</h3>
                        <p className="mb-6">
                            Esta Política será regida, interpretada e executada conforme as leis da República
                            Federativa do Brasil, especialmente a LGPD. Fica eleito o foro da comarca da sede da
                            empresa para dirimir quaisquer questões oriundas deste documento, salvo disposição
                            legal em contrário.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}