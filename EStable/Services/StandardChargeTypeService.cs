using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Importers;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.Services
{
    public interface IStandardChargeTypeService
    {
        List<StandardChargeTypeViewModel> SaveStandardCharge(string description, string rate, string email);
        ChargeTypesWizard ImportStableCharges(HttpPostedFileBase file, string email);
    }

    class StandardChargeTypeService : IStandardChargeTypeService
    {
        private readonly WizardService _wizardService =
            new WizardService();
        private readonly IChargeTypeViewModelFactory _factory =
            new ChargeTypeViewModelFactory();

        private readonly IStandardChargeImporter _importer = new StandardChargeImporter();


        public List<StandardChargeTypeViewModel> SaveStandardCharge(string description, string rate, string email)
        {
            var wizard = _wizardService.GetWizard(email);
            var id = wizard.ChargeTypes.StandardChargeTypes.Max(c => c.StandardChargeId) + 1;
            var standardCharge = new StandardCharge(id, description, rate);
            wizard.AddStandardCharge(standardCharge);

            return SaveXmlAndGetViewModel(email, wizard);
        }

        public ChargeTypesWizard ImportStableCharges(HttpPostedFileBase file, string email)
        {
            var wizard = _wizardService.GetWizard(email);

            var chargeTypes = _importer.ImportStableCharges(file);
            wizard.AddStandardCharges(chargeTypes);

            SaveXml(email, wizard);
            return wizard.ChargeTypes;
        }

        private List<StandardChargeTypeViewModel> SaveXmlAndGetViewModel(string email, SummaryWizard wizard)
        {
            SaveXml(email, wizard);
            return _factory.ToViewModel(wizard.ChargeTypes.StandardChargeTypes);
        }

        private void SaveXml(string email, SummaryWizard wizard)
        {
            var fileName = _wizardService.GetStableRegFileInfo(email);
            wizard.SaveXml(fileName.SystemFileName);
        }
    }
}