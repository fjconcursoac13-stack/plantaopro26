import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Shield, 
  Calendar, 
  Clock, 
  Users, 
  RefreshCw,
  BarChart3,
  Target,
  Mail,
  Building2,
  Award,
  CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Organização de Plantões',
    description: 'Gerencie seus plantões de forma visual e organizada, com alertas e notificações automáticas.'
  },
  {
    icon: BarChart3,
    title: 'Controle de Escalas',
    description: 'Visualize e acompanhe escalas da sua equipe com precisão e clareza operacional.'
  },
  {
    icon: Clock,
    title: 'Gestão de Banco de Horas',
    description: 'Controle completo do seu BH com registro de créditos, débitos e evolução mensal.'
  },
  {
    icon: RefreshCw,
    title: 'Registro de Permutas',
    description: 'Solicite e acompanhe trocas de plantão com outros agentes de forma simples e documentada.'
  },
  {
    icon: Users,
    title: 'Organização de Equipes',
    description: 'Conecte-se com sua equipe através de chat integrado e visualização de membros.'
  },
  {
    icon: Target,
    title: 'Planejamento da Rotina',
    description: 'Planeje sua vida funcional com antecedência, visualizando compromissos e folgas.'
  }
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-4xl items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl px-4 py-8 md:py-12">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            PlantãoPro
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Solução desenvolvida para auxiliar profissionais da <strong className="text-foreground">Segurança Pública</strong> a 
            organizarem sua vida funcional de forma prática, segura e eficiente.
          </p>
        </section>

        <Separator className="my-8" />

        {/* Features Grid */}
        <section className="mb-12">
          <h2 className="mb-6 text-center text-xl font-semibold text-foreground md:text-2xl">
            Funcionalidades Principais
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card 
                key={feature.title} 
                className="border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Origin Story */}
        <section className="mb-12">
          <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex-shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-semibold text-foreground md:text-2xl">
                    Origem do Projeto
                  </h2>
                  
                  <p className="leading-relaxed text-muted-foreground">
                    O <strong className="text-foreground">PlantãoPro</strong> foi idealizado e desenvolvido por um 
                    <strong className="text-foreground"> Agente de Segurança Pública</strong> e 
                    <strong className="text-foreground"> Agente Socioeducativo</strong> do município de 
                    <strong className="text-foreground"> Feijó</strong>, no estado do 
                    <strong className="text-foreground"> Acre</strong>.
                  </p>
                  
                  <p className="leading-relaxed text-muted-foreground">
                    O aplicativo nasceu da necessidade real de resolver problemas enfrentados no dia a dia da 
                    categoria, trazendo praticidade e organização para a rotina profissional de quem atua na 
                    linha de frente da segurança pública.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                      <Award className="h-4 w-4" />
                      Feito por quem entende
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Foco em problemas reais
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-8" />

        {/* Contact Section */}
        <section className="text-center">
          <h2 className="mb-6 text-xl font-semibold text-foreground md:text-2xl">
            Contato
          </h2>
          
          <Card className="mx-auto max-w-md border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <p className="mb-4 text-sm text-muted-foreground">
                Para dúvidas, sugestões ou suporte técnico:
              </p>
              
              <div className="space-y-2">
                <a 
                  href="mailto:francdenisbr@gmail.com"
                  className="block rounded-lg bg-secondary/50 px-4 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  francdenisbr@gmail.com
                </a>
                <a 
                  href="mailto:plantaopro@proton.me"
                  className="block rounded-lg bg-secondary/50 px-4 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  plantaopro@proton.me
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PlantãoPro. Todos os direitos reservados.</p>
          <p className="mt-1">Desenvolvido com dedicação para a Segurança Pública brasileira.</p>
        </footer>
      </main>
    </div>
  );
}
