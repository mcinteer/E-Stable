using System.Runtime.Serialization;
using EStable.Models;
using EStable.Models.Wizard;

namespace EStable.ViewModels.UserOfStableViewModels
{
    [DataContract]
    public class BaseUserOfStableViewModel
    {
        [DataMember]
        public string StableName { get; set; }
        [DataMember]
        public string Email { get; set; }
        [DataMember]
        UserOfStablePortal Portal { get; set; }
        [DataMember]
        public Stable Stable { get; set; }
        [DataMember]
        public StableUser StableUser { get; set; }
        [DataMember]
        public bool IsValid { get; set; }
    }
}