using System.Collections.Generic;
using System.Web;
using System.Xml.Serialization;
using EStable.Constants;
using EStable.Helpers;
using EStable.Models.Wizard.Stable_Wizard;

namespace EStable.Models.Wizard
{
    [XmlRoot]
    [XmlInclude(typeof(StableWizardBase))]
    public class SummaryWizard : StableWizardBase
    {
        [XmlElement]
        public ContactInformationWizard ContactInformation { get; set; }

        [XmlElement]
        public FinancialInformationWizard FinancialInformation { get; set; }

        [XmlElement]
        public ChargeTypesWizard ChargeTypes { get; set; }

        [XmlElement]
        public AnimalDetailsWizardBase AnimalDetails { get; set; }

        [XmlElement]
        public AnimalOwnersBase AnimalOwners { get; set; }

        #region Constructors

        public SummaryWizard()
        {
            ContactInformation = new ContactInformationWizard();
            FinancialInformation = new FinancialInformationWizard();
            ChargeTypes = new ChargeTypesWizard();
            AnimalDetails = new AnimalDetailsWizardBase();
            //StableAnimalChargeType = new StableAnimalChargeTypeWizardBase();
            AnimalOwners = new AnimalOwnersBase();
        }

        public SummaryWizard(HttpCookie cookie, string key, string step)
        {
            PopulateSummaryWizard(cookie, key, step);
        }

        #endregion

        public void PopulateSummaryWizard(HttpCookie cookie, string key, string step)
        {

            switch (step)
            {
                case Codes.Cookies.Wizard.StepOne.Key:
                    Email = cookie[Codes.Cookies.Wizard.StepOne.Email];
                    ContactInformation  = new ContactInformationWizard(cookie);
                    break;
                case Codes.Cookies.Wizard.StepTwo.Key:
                    FinancialInformation = new FinancialInformationWizard(cookie);
                    break;
                case Codes.Cookies.Wizard.StepThree.Key:
                    //ChargeTypes = new ChargeTypesWizard(cookie);
                    break;
                case Codes.Cookies.Wizard.StepFour.Key:
                    //AnimalDetails = new AnimalDetailsWizardBase(cookie);
                    break;
                case Codes.Cookies.Wizard.StepSix.Key:
                    //Owners = new OwnersWizardBase(cookie);
                    break;
                case Codes.Cookies.Wizard.StepSeven.Key:
                    //Ownership = new OwnershipWizard(cookie);
                    break;
            }
        }

        public void SaveXml(string fileName)
        {
            fileName += ".xml";
            XmlSerializationHelper.SerializeAndSave(fileName, this);
        }

        public void AddStableCharge(StableChargeType stableChargeType)
        {
            ChargeTypes.AddStableChargeType(stableChargeType);
        }

        public void AddStandardCharge(StandardCharge standardCharge)
        {
            ChargeTypes.AddStandardChargeType(standardCharge);
        }

        public void AddStableAnimal(StableAnimal animal)
        {
            AnimalDetails.AddStableAnimal(animal);
        }

        public void AddAnimalOwnership(AnimalOwnership ownership)
        {
            AnimalOwners.AddAnimalOwnership(ownership);
        }

        public void AddStableCharges(List<StableChargeType> chargeTypes)
        {
            ChargeTypes.AddStableChargeTypes(chargeTypes);
        }

        public void AddStandardCharges(List<StandardCharge> chargeTypes)
        {
            ChargeTypes.AddStandardChargeTypes(chargeTypes);
        }
    }
}