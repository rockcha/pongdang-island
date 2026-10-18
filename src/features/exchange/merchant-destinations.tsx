import {merchantDestinations} from '@/lib/merchant-destinations'
import {PlaceDestinations} from '@/components/place-destinations'

export function MerchantDestinations(){
 return <PlaceDestinations scrollable title="상인거리" directory="merchants" items={merchantDestinations}/>
}
