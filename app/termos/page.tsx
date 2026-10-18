import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { TERMS_TEXT, TERMS_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Autorização de uso',
};

export default function TermsPage() {
  return (
    <LegalPage kicker={`Versão ${TERMS_VERSION}`} title="Autorização de uso">
      <h2>Texto aceito no envio</h2>
      <blockquote className="quote">{TERMS_TEXT}</blockquote>
      <p>
        A caixa de autorização começa desmarcada. O envio só segue depois do aceite explícito. O arquivo guarda este
        texto, a versão {TERMS_VERSION}, a data e a hora em UTC e o identificador único da ficha.
      </p>
      <p>
        A autorização é gratuita e não exclusiva. A equipe pode adaptar o personagem como figurante dentro desse
        escopo, inclusive em material de divulgação monetizado. Não há pagamento nem promessa de aparição. A
        titularidade da criação continua com quem a enviou. O aceite na ficha é a concordância com esse uso gratuito,
        sem necessidade de remuneração.
      </p>
    </LegalPage>
  );
}
