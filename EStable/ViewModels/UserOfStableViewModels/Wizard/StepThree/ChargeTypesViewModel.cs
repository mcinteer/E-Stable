﻿using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Web.Script.Serialization;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree
{
    [DataContract]
    public class ChargeTypesViewModel : BaseUserOfStableViewModel
    {
        [DataMember]
        public List<StableChargeTypeViewModel> StableChargeTypes { get; set; }
        
        [DataMember]
        public List<StandardChargeTypeViewModel> StandardChargeTypes { get; set; }

        [DataMember]
        public int StableId { get; set; }
        
        public string GetStableChargeTypesJson()
        {
            var jss = new JavaScriptSerializer();
            return jss.Serialize(StableChargeTypes);
        }

        public string GetStandardChargeTypesJson()
        {
            var jss = new JavaScriptSerializer();
            return jss.Serialize(StandardChargeTypes);
        }
    }
}
