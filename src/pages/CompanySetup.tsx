
import Layout from "@/components/layout/Layout";
import CompanySetupWizard from "@/components/company/CompanySetupWizard";

const CompanySetup = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to HealthBeat</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Let's set up your company to get started with monitoring your services
          </p>
        </div>
        <CompanySetupWizard />
      </div>
    </Layout>
  );
};

export default CompanySetup;
