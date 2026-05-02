use std::hash::poseidon2::Poseidon2;

fn main(
    // --- PRIVATE WITNESSES ---
    secret: Field,
    private_license_data: Field,
    merkle_path: [Field; 20],
    leaf_index: u32,
    // --- PUBLIC INPUTS ---
    public_name: pub Field,
    public_merkle_root: pub Field
) {
    // CONSTRAINT 1: Leaf Reconstruction
    // Poseidon2 with 3 inputs — matches bb.js poseidon2Hash([secret, private_license_data, public_name])
    let computed_leaf = Poseidon2::hash([secret, private_license_data, public_name], 3);

    // CONSTRAINT 2: Merkle Inclusion Proof (Manual Loop)
    // Poseidon2 with 2 inputs — matches bb.js poseidon2Hash([left, right])
    let mut computed_root = computed_leaf;
    let mut index = leaf_index;

    for i in 0..20 {
        let sibling = merkle_path[i];

        if index % 2 == 0 {
            computed_root = Poseidon2::hash([computed_root, sibling], 2);
        } else {
            computed_root = Poseidon2::hash([sibling, computed_root], 2);
        }

        index = index / 2;
    }

    // CONSTRAINT 3: State Verification
    assert(computed_root == public_merkle_root);
}
