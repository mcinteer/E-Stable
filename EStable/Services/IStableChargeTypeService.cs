using System.Collections.Generic;
using System.IO;
using System.Web;
using System.Web.UI.WebControls;
using EStable.Importers;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;
using LumenWorks.Framework.IO.Csv;

namespace EStable.Services
{
    public interface IStableChargeTypeService
    {
        List<StableChargeTypeViewModel> SaveStableCharge(string unit, string instable, string description, string rate, string email);
        ChargeTypesWizard ImportStableCharges(HttpPostedFileBase file, string email);
    }

    public class StableChargeTypeService : IStableChargeTypeService
    {
        private readonly WizardService _wizardService = new WizardService();
        private readonly IChargeTypeViewModelFactory _factory = new ChargeTypeViewModelFactory();
        private readonly IStableChargeImporter _importer = new StableChargeImporter();

        public List<StableChargeTypeViewModel> SaveStableCharge(string unit, string instable, string description, string rate, string email)
        {
            var stableChargeType = new StableChargeType(unit, instable, description, rate);
            
            var wizard = _wizardService.GetWizard(email); 
            wizard.AddStableCharge(stableChargeType);

            return SaveXmlAndGetViewModel(email, wizard);
        }

        public ChargeTypesWizard ImportStableCharges(HttpPostedFileBase file, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            var chargeTypes = _importer.ImportStableCharges(file);
            wizard.AddStableCharges(chargeTypes);

            SaveXml(email, wizard);
            return wizard.ChargeTypes;
        }

        private List<StableChargeTypeViewModel> SaveXmlAndGetViewModel(string email, SummaryWizard wizard)
        {
            SaveXml(email, wizard);

            return _factory.ToViewModel(wizard.ChargeTypes.StableChargeTypes);
        }

        private void SaveXml(string email, SummaryWizard wizard)
        {
            var fileName = _wizardService.GetStableRegFileInfo(email);
            wizard.SaveXml(fileName.SystemFileName);
        }
    }
}