using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI.WebControls;
using EStable.Controllers;
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
        List<StableChargeTypeViewModel> UpdateStableChargeUnit(string id, string unit, string email);
        List<StableChargeTypeViewModel> UpdateStableChargeInstable(string id, bool instable, string email);
        List<StableChargeTypeViewModel> UpdateStableChargeDescription(string id, string description, string email);
        List<StableChargeTypeViewModel> UpdateStableChargeRate(string id, string rate, string email);
        ChargeTypesViewModel UpdateStandardChargeDescription(string id, string description, string email);
        ChargeTypesViewModel UpdateStandardChargeRate(string id, string rate, string email);
        List<StableChargeTypeViewModel> SaveStableCharge(List<WizardController.UiStableCharge> charges, string email);
    }

    public class StableChargeTypeService : IStableChargeTypeService
    {
        private readonly WizardService _wizardService = new WizardService();
        private readonly IChargeTypeViewModelFactory _factory = new ChargeTypeViewModelFactory();
        private readonly IStableChargeImporter _importer = new StableChargeImporter();

        public List<StableChargeTypeViewModel> SaveStableCharge(List<WizardController.UiStableCharge> charges, string email)
        {
            var wizard = _wizardService.GetWizard(email);
            wizard.SaveStableCharges(charges);
            return SaveXmlAndGetViewModel(email, wizard);
        }

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

        public List<StableChargeTypeViewModel> UpdateStableChargeUnit(string id, string unit, string email)
        {
            var wizard = _wizardService.GetWizard(email);

                wizard.SaveStableChargeTypeUnit(id, unit);
            
            return SaveXmlAndGetViewModel(email, wizard);
        }

        public List<StableChargeTypeViewModel> UpdateStableChargeInstable(string id, bool instable, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            wizard.SaveStableChargeTypeInStable(id, instable);

            return SaveXmlAndGetViewModel(email, wizard);
        }

        public List<StableChargeTypeViewModel> UpdateStableChargeDescription(string id, string description, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            wizard.SaveStableChargeTypeDescription(id, description);

            return SaveXmlAndGetViewModel(email, wizard);
        }

        public List<StableChargeTypeViewModel> UpdateStableChargeRate(string id, string rate, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            wizard.SaveStableChargeTypeChargeRate(id, rate);

            return SaveXmlAndGetViewModel(email, wizard);
        }

        public ChargeTypesViewModel UpdateStandardChargeDescription(string id, string description, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            wizard.SaveStandardChargeTypeChargeDescription(id, description);

            return SaveXmlAndGetChargeTypeViewModel(email, wizard);
        }

        public ChargeTypesViewModel UpdateStandardChargeRate(string id, string rate, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            wizard.SaveStandardChargeTypeChargeRate(id, rate);

            return SaveXmlAndGetChargeTypeViewModel(email, wizard);
        }
        
        private ChargeTypesViewModel SaveXmlAndGetChargeTypeViewModel(string email, SummaryWizard wizard)
        {
            SaveXml(email, wizard);

            return _factory.ToViewModel(wizard.ChargeTypes);
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