import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacidade',
};

export default function PrivacyPage() {
  return (
    <LegalPage kicker="Dados da ficha" title="Privacidade">
      <p>
        A ficha coleta o nome do personagem, a rede social, o @ do criador, a imagem enviada e o registro do aceite dos
        termos, inclusive a concordância com o uso gratuito, sem remuneração.
      </p>
      <p>
        Cada envio vira uma pasta privada no Google Drive da produção. Dentro ficam a imagem, um texto com os dados da
        ficha e um JSON com o identificador, o nome original do arquivo, a data em UTC e a versão exata da autorização.
        O endereço de IP não entra nesse arquivo.
      </p>
      <p>
        O IP é usado só na memória do servidor, por cerca de uma hora, para limitar envios repetidos. Essa memória se
        perde quando o processo reinicia e não vira cadastro.
      </p>
      <p>
        A imagem e os metadados existem para avaliar a participação como figurante e para guardar a prova do aceite. O
        envio não garante aparição. Não há venda desses dados por este site.
      </p>
      <p>
        Para pedir a retirada de uma ficha, fale com quem opera a produção de Lost Tapes, informando o identificador
        mostrado na tela de confirmação.
      </p>
    </LegalPage>
  );
}
